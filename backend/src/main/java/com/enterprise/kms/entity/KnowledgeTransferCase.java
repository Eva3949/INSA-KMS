package com.enterprise.kms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_transfer_cases")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnowledgeTransferCase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_rep_id")
    private User hrRep;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_id")
    private User successor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "reason_type", nullable = false, length = 50)
    private String reasonType; // RESIGNATION, TERMINATION, RETIREMENT, TRANSFER

    @Column(name = "start_date")
    private LocalDate startDate = LocalDate.now();

    @Column(name = "expected_completion_date")
    private LocalDate expectedCompletionDate;

    @Column(nullable = false, length = 50)
    private String status = "INITIATED"; // INITIATED, IN_PROGRESS, UNDER_REVIEW, CHANGES_REQUESTED, COMPLETED, CANCELLED

    @Column(length = 30)
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "clearance_status", length = 50)
    private String clearanceStatus = "PENDING"; // PENDING, READY_FOR_CLEARANCE, CLEARED

    @Column(name = "employee_snapshot_name", length = 150)
    private String employeeSnapshotName;

    @Column(name = "employee_snapshot_title", length = 100)
    private String employeeSnapshotTitle;

    @Column(name = "employee_snapshot_dept", length = 100)
    private String employeeSnapshotDept;

    @Column(name = "employee_snapshot_number", length = 50)
    private String employeeSnapshotNumber;

    @Column(name = "manager_snapshot_name", length = 150)
    private String managerSnapshotName;

    @Column(name = "exit_date")
    private LocalDate exitDate;

    @Column(name = "manager_approved")
    private Boolean managerApproved = false;

    @Column(name = "manager_approved_at")
    private OffsetDateTime managerApprovedAt;

    @Column(name = "hr_approved")
    private Boolean hrApproved = false;

    @Column(name = "hr_approved_at")
    private OffsetDateTime hrApprovedAt;

    @Column(name = "successor_accepted")
    private Boolean successorAccepted = false;

    @Column(name = "successor_accepted_at")
    private OffsetDateTime successorAcceptedAt;

    @Column(name = "successor_notes", columnDefinition = "TEXT")
    private String successorNotes;

    @Column(name = "access_revoked")
    private Boolean accessRevoked = false;

    @Column(name = "access_revoked_at")
    private OffsetDateTime accessRevokedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public User getEmployee() { return employee; }
    public void setEmployee(User employee) { this.employee = employee; }

    public User getManager() { return manager; }
    public void setManager(User manager) { this.manager = manager; }

    public User getHrRep() { return hrRep; }
    public void setHrRep(User hrRep) { this.hrRep = hrRep; }

    public User getSuccessor() { return successor; }
    public void setSuccessor(User successor) { this.successor = successor; }

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }

    public String getReasonType() { return reasonType; }
    public void setReasonType(String reasonType) { this.reasonType = reasonType; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getExpectedCompletionDate() { return expectedCompletionDate; }
    public void setExpectedCompletionDate(LocalDate expectedCompletionDate) { this.expectedCompletionDate = expectedCompletionDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getClearanceStatus() { return clearanceStatus; }
    public void setClearanceStatus(String clearanceStatus) { this.clearanceStatus = clearanceStatus; }

    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }

    public String getEmployeeSnapshotName() { return employeeSnapshotName; }
    public void setEmployeeSnapshotName(String employeeSnapshotName) { this.employeeSnapshotName = employeeSnapshotName; }

    public String getEmployeeSnapshotTitle() { return employeeSnapshotTitle; }
    public void setEmployeeSnapshotTitle(String employeeSnapshotTitle) { this.employeeSnapshotTitle = employeeSnapshotTitle; }

    public String getEmployeeSnapshotDept() { return employeeSnapshotDept; }
    public void setEmployeeSnapshotDept(String employeeSnapshotDept) { this.employeeSnapshotDept = employeeSnapshotDept; }

    public String getEmployeeSnapshotNumber() { return employeeSnapshotNumber; }
    public void setEmployeeSnapshotNumber(String employeeSnapshotNumber) { this.employeeSnapshotNumber = employeeSnapshotNumber; }

    public String getManagerSnapshotName() { return managerSnapshotName; }
    public void setManagerSnapshotName(String managerSnapshotName) { this.managerSnapshotName = managerSnapshotName; }

    public LocalDate getExitDate() { return exitDate; }
    public void setExitDate(LocalDate exitDate) { this.exitDate = exitDate; }

    public Boolean getManagerApproved() { return managerApproved; }
    public void setManagerApproved(Boolean managerApproved) { this.managerApproved = managerApproved; }

    public OffsetDateTime getManagerApprovedAt() { return managerApprovedAt; }
    public void setManagerApprovedAt(OffsetDateTime managerApprovedAt) { this.managerApprovedAt = managerApprovedAt; }

    public Boolean getHrApproved() { return hrApproved; }
    public void setHrApproved(Boolean hrApproved) { this.hrApproved = hrApproved; }

    public OffsetDateTime getHrApprovedAt() { return hrApprovedAt; }
    public void setHrApprovedAt(OffsetDateTime hrApprovedAt) { this.hrApprovedAt = hrApprovedAt; }

    public Boolean getSuccessorAccepted() { return successorAccepted; }
    public void setSuccessorAccepted(Boolean successorAccepted) { this.successorAccepted = successorAccepted; }

    public OffsetDateTime getSuccessorAcceptedAt() { return successorAcceptedAt; }
    public void setSuccessorAcceptedAt(OffsetDateTime successorAcceptedAt) { this.successorAcceptedAt = successorAcceptedAt; }

    public String getSuccessorNotes() { return successorNotes; }
    public void setSuccessorNotes(String successorNotes) { this.successorNotes = successorNotes; }

    public Boolean getAccessRevoked() { return accessRevoked; }
    public void setAccessRevoked(Boolean accessRevoked) { this.accessRevoked = accessRevoked; }

    public OffsetDateTime getAccessRevokedAt() { return accessRevokedAt; }
    public void setAccessRevokedAt(OffsetDateTime accessRevokedAt) { this.accessRevokedAt = accessRevokedAt; }
}
