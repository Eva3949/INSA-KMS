package com.enterprise.kms.service;

import com.enterprise.kms.entity.SystemSetting;
import com.enterprise.kms.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class SystemSettingService {
    private final SystemSettingRepository systemSettingRepository;

    public SystemSettingService(SystemSettingRepository systemSettingRepository) {
        this.systemSettingRepository = systemSettingRepository;
    }

    public List<SystemSetting> getAllSettings() {
        return systemSettingRepository.findAll();
    }

    @Transactional
    public List<SystemSetting> updateSettings(Map<String, String> settings) {
        settings.forEach((key, value) -> {
            if (key == null || key.isBlank() || value == null) {
                return;
            }
            SystemSetting setting = systemSettingRepository.findById(key)
                    .orElseGet(() -> {
                        SystemSetting s = new SystemSetting();
                        s.setSettingKey(key);
                        return s;
                    });
            setting.setSettingValue(value);
            setting.setUpdatedAt(OffsetDateTime.now());
            systemSettingRepository.save(setting);
        });
        return getAllSettings();
    }

    public String getSettingValue(String key, String defaultValue) {
        return systemSettingRepository.findById(key)
                .map(SystemSetting::getSettingValue)
                .orElse(defaultValue);
    }
}
