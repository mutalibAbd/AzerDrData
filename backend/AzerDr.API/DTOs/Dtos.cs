namespace AzerDr.API.DTOs;

// Auth
public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Username, string FullName, string Role);

// Dashboard
public record DashboardStats(int Total, int Coded, int Pending, int InProgress, int MyCodings);

public record MyCodingItem(
    int AnomalyId,
    string PatientId,
    string Date,
    string DiaqnozCode,
    string DiaqnozName,
    string? Qeyd,
    DateTime CodedAt
);

// Anomaly
public record AnomalyResponse(
    int Id,
    string ReportId,
    string PatientId,
    string Date,
    string Diagnosis,
    string Explanation
);

public record SaveCodingRequest(
    string RubrikaCode,
    string RubrikaName,
    string BashliqCode,
    string BashliqName,
    string DiaqnozCode,
    string DiaqnozName,
    string? IcdQeydName,
    string? Qeyd
);

public record ErrorReportRequest(
    string FieldName,
    string CorrectedText,
    string? Note
);

// ICD
public record IcdRubrikaDto(int Id, string Code, string Name);
public record IcdBashliqDto(int Id, string Code, string Name);
public record IcdDiaqnozDto(int Id, string Code, string Name);
public record IcdQeydDto(int Id, string Name);

// Admin
public record CreateDoctorRequest(string Username, string Password, string FullName);
public record UpdateDoctorRequest(string? FullName, string? Password, bool? IsActive);

public record DoctorListItem(
    Guid Id,
    string Username,
    string FullName,
    bool IsActive,
    int CodingCount,
    DateTime CreatedAt
);

public record ProgressItem(
    Guid DoctorId,
    string DoctorName,
    int CodingCount,
    DateTime? LastCodingAt
);

public record ErrorReportItem(
    int Id,
    int AnomalyId,
    string PatientId,
    string DoctorName,
    string FieldName,
    string OriginalText,
    string CorrectedText,
    string? Note,
    string Status,
    DateTime CreatedAt
);

public record ReviewErrorRequest(string Status); // accepted or rejected
