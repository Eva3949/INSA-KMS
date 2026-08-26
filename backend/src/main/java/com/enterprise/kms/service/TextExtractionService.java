package com.enterprise.kms.service;

import com.enterprise.kms.entity.DocumentVersion;
import com.enterprise.kms.entity.OcrJob;
import com.enterprise.kms.repository.OcrJobRepository;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class TextExtractionService {
    private static final Logger log = LoggerFactory.getLogger(TextExtractionService.class);
    private static final int MAX_PAGES = 50;
    private static final int MAX_CHARS = 400_000;
    private static final int MAX_OCR_RETRIES = 3;

    private final OcrJobRepository ocrJobRepository;

    @Value("${kms.ocr.tessdata-path:./tessdata}")
    private String tessDataPath;

    public TextExtractionService(OcrJobRepository ocrJobRepository) {
        this.ocrJobRepository = ocrJobRepository;
    }

    @Transactional
    public void processNewVersion(DocumentVersion version, byte[] content, String mimeType, String fileName) {
        String mime = mimeType != null ? mimeType.toLowerCase() : "";
        try {
            if (mime.contains("pdf")) {
                extractPdfText(version, content);
            } else if (mime.startsWith("image/")) {
                runOcrOnImage(version, content);
            }
        } catch (Exception e) {
            log.warn("Text extraction failed for {}: {}", fileName, e.getMessage());
        }
    }

    private void extractPdfText(DocumentVersion version, byte[] content) throws Exception {
        try (PDDocument pdf = PDDocument.load(content)) {
            int pages = Math.min(pdf.getNumberOfPages(), MAX_PAGES);
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(pages);
            String text = stripper.getText(pdf);
            if (text != null && !text.isBlank()) {
                if (text.length() > MAX_CHARS) {
                    text = text.substring(0, MAX_CHARS);
                }
                version.setExtractedText(text);
            } else {
                queueOcrJob(version, "PDF has no text layer; OCR required.");
            }
        }
    }

    private void runOcrOnImage(DocumentVersion version, byte[] content) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(content));
            if (image == null) {
                queueOcrJob(version, "Could not decode image for OCR.");
                return;
            }
            String text = runTesseract(image);
            if (text != null && !text.isBlank()) {
                if (text.length() > MAX_CHARS) {
                    text = text.substring(0, MAX_CHARS);
                }
                version.setExtractedText(text);
                log.info("OCR completed for image version {}", version.getId());
            } else {
                queueOcrJob(version, "OCR returned empty text.");
            }
        } catch (Exception e) {
            log.warn("Direct image OCR failed, queueing job: {}", e.getMessage());
            queueOcrJob(version, "Image OCR failed: " + e.getMessage());
        }
    }

    private String runTesseract(BufferedImage image) throws TesseractException {
        ITesseract tesseract = new Tesseract();
        File dataDir = new File(tessDataPath);
        if (dataDir.exists()) {
            tesseract.setDatapath(tessDataPath);
        } else {
            String fallback = System.getenv("TESSDATA_PREFIX");
            if (fallback != null && !fallback.isBlank()) {
                tesseract.setDatapath(fallback);
            }
        }
        tesseract.setLanguage("eng");
        tesseract.setPageSegMode(3);
        return tesseract.doOCR(image);
    }

    @Transactional
    public void queueOcrJob(DocumentVersion version, String reason) {
        OcrJob job = new OcrJob();
        job.setVersion(version);
        job.setStatus("PENDING");
        job.setErrorMessage(reason);
        ocrJobRepository.save(job);
    }

    @Scheduled(fixedDelayString = "${kms.ocr.poll-interval-ms:60000}", initialDelayString = "${kms.ocr.initial-delay-ms:30000}")
    @Transactional
    public void processPendingOcrJobs() {
        List<OcrJob> pending = ocrJobRepository.findByStatusOrderByCreatedAtAsc("PENDING",
                PageRequest.of(0, 10));
        if (pending.isEmpty()) {
            return;
        }
        log.info("Processing {} pending OCR jobs", pending.size());

        for (OcrJob job : pending) {
            if (job.getVersion() == null) {
                job.setStatus("FAILED");
                job.setErrorMessage("No version attached to OCR job.");
                job.setProcessedAt(java.time.OffsetDateTime.now());
                ocrJobRepository.save(job);
                continue;
            }
            DocumentVersion version = job.getVersion();
            try {
                String extracted = extractTextFromStoredFile(version);
                if (extracted != null && !extracted.isBlank()) {
                    version.setExtractedText(extracted);
                    job.setStatus("COMPLETED");
                    log.info("OCR job {} completed for version {}", job.getId(), version.getId());
                } else {
                    job.setStatus("FAILED");
                    job.setErrorMessage("OCR produced no text output.");
                }
            } catch (UnsatisfiedLinkError e) {
                job.setErrorMessage("Tesseract native library not available: " + e.getMessage() + ". Install Tesseract OCR to process scanned documents.");
                log.warn("Tesseract not installed, leaving job PENDING: {}", e.getMessage());
                return;
            } catch (TesseractException e) {
                job.setStatus("FAILED");
                job.setErrorMessage("Tesseract error: " + e.getMessage());
                log.warn("OCR failed for job {}: {}", job.getId(), e.getMessage());
            } catch (Exception e) {
                job.setStatus("FAILED");
                job.setErrorMessage("OCR processing error: " + e.getMessage());
                log.warn("OCR processing error for job {}: {}", job.getId(), e.getMessage());
            }
            job.setProcessedAt(java.time.OffsetDateTime.now());
            ocrJobRepository.save(job);
        }
    }

    private String extractTextFromStoredFile(DocumentVersion version) throws Exception {
        if (version.getStorageObject() == null || version.getStorageObject().getStoragePath() == null) {
            return null;
        }
        Path filePath = Path.of(version.getStorageObject().getStoragePath());
        if (!Files.exists(filePath)) {
            return null;
        }
        byte[] content = Files.readAllBytes(filePath);
        String fileName = version.getFileName() != null ? version.getFileName().toLowerCase() : "";

        if (fileName.endsWith(".pdf")) {
            try (PDDocument pdf = PDDocument.load(content)) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(1);
                stripper.setEndPage(Math.min(pdf.getNumberOfPages(), MAX_PAGES));
                return stripper.getText(pdf);
            }
        } else if (fileName.matches(".*\\.(png|jpg|jpeg|gif|bmp|tiff|tif)$")) {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(content));
            if (image != null) {
                return runTesseract(image);
            }
        }
        return null;
    }

    @Transactional(readOnly = true)
    public long countPendingOcrJobs() {
        return ocrJobRepository.countByStatus("PENDING");
    }

    @Transactional(readOnly = true)
    public List<OcrJob> recentJobs(int limit) {
        return ocrJobRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, Math.min(Math.max(limit, 1), 200)));
    }
}