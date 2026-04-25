using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace AzerDr.API.DTOs;

// Auth
public record LoginRequest(
    [Required, StringLength(50)] string Username,
    [Required, StringLength(100)] string Password
);
public record LoginResponse(string Token, string Username, string FullName, string Role);

// Dashboard
public record DashboardStats(int Total, int Coded, int Pending, int InProgress, int MyCodings);

// ICD-11
// PostCoordination is stored as a raw JsonElement (camelCase from frontend) and
// passed through to the DB without transformation, preserving original key casing.
public record Icd11CodeEntry(
    [Required, StringLength(50)]  string Icd11Code,
    [Required, StringLength(500)] string Icd11Title,
    [StringLength(100)]           string? EntityId,
    [Required, RegularExpression("^(tree|search)$")] string Source,
    JsonElement?                  PostCoordination = null
);

public record SaveIcd11CodingRequest(
    [Required, MinLength(1)] List<Icd11CodeEntry> Codes,
    [StringLength(2000)]     string? Qeyd
);

public record Icd11SearchResult(
    string  Code,
    string  Title,
    string? EntityId,
    bool    HasPostcoordination = false
);

public record PostcoordAxis(
    string       AxisName,
    bool         Required,
    List<string> AllowedValues
);

public record Icd11EntityDetails(
    string             Title,
    string?            Description,
    List<string>       Exclusions,
    List<string>       CodedElsewhere,
    List<PostcoordAxis> RequiredAxes,
    List<PostcoordAxis> OptionalAxes
);

public record MyCodingItem(
    int AnomalyId,
    string PatientId,
    string Date,
    List<Icd11CodeEntry> Codes,
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
