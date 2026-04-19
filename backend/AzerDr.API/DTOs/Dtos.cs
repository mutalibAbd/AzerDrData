using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.DTOs;

// Auth
public record LoginRequest(
    [Required, StringLength(50)] string Username,
    [Required, StringLength(100)] string Password
);
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
    [Required, StringLength(200)] string RubrikaCode,
    [Required, StringLength(500)] string RubrikaName,
    [Required, StringLength(200)] string BashliqCode,
    [Required, StringLength(500)] string BashliqName,
    [StringLength(200)] string? DiaqnozCode,
    [StringLength(500)] string? DiaqnozName,
    [StringLength(2000)] string? IcdQeydName,
    [StringLength(2000)] string? Qeyd
);

public class ErrorReportRequest
{
    [Required, RegularExpression("^(spelling|logic)$", ErrorMessage = "ErrorType must be 'spelling' or 'logic'")]
    public string ErrorType { get; set; } = "spelling";

    [StringLength(100)]
    public string? FieldName { get; set; }

    [StringLength(2000)]
    public string? CorrectedText { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    [StringLength(2000)]
    public string? Note { get; set; }
}

// ICD
public record IcdRubrikaDto(int Id, string Code, string Name);
public record IcdBashliqDto(int Id, string Code, string Name);
public record IcdDiaqnozDto(int Id, string Code, string Name);
public record IcdQeydDto(int Id, string Name, List<IcdQeydChildDto>? Children = null);
public record IcdQeydChildDto(int Id, string Name);

// Leaderboard
public record LeaderboardItem(string DoctorName, int CodingCount, int Rank);

// Admin
public record CreateDoctorRequest(
    [Required, StringLength(50)] string Username,
    [Required, StringLength(100)] string Password,
    [Required, StringLength(100)] string FullName,
    [RegularExpression("^(doctor|admin)$", ErrorMessage = "Role must be 'doctor' or 'admin'")]
    string? Role = "doctor"
);
public record UpdateDoctorRequest(
    [StringLength(100)] string? FullName,
    [StringLength(100)] string? Password,
    bool? IsActive,
    [RegularExpression("^(doctor|admin)$")] string? Role
);

public record DoctorListItem(
    Guid Id,
    string Username,
    string FullName,
    string Role,
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
    string ErrorType,
    string? FieldName,
    string? OriginalText,
    string? CorrectedText,
    string? Description,
    string? Note,
    string Status,
    DateTime CreatedAt
);

public record ReviewErrorRequest(
    [Required, RegularExpression("^(accepted|rejected)$", ErrorMessage = "Status must be 'accepted' or 'rejected'")]
    string Status
);
