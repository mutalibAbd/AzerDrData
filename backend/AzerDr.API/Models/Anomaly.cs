using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class Anomaly
{
    [Key]
    public int Id { get; set; }

    [MaxLength(20)]
    public string ReportId { get; set; } = string.Empty;

    [MaxLength(20)]
    public string PatientId { get; set; } = string.Empty;

    public DateOnly Date { get; set; }

    public string Diagnosis { get; set; } = string.Empty;

    public string Explanation { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Status { get; set; } = "pending"; // pending, in_progress, completed

    public Guid? AssignedTo { get; set; }
    public DateTime? AssignedAt { get; set; }

    public Guid? CodedBy { get; set; }
    public DateTime? CodedAt { get; set; }

    // Navigation
    public User? AssignedDoctor { get; set; }
    public User? CodingDoctor { get; set; }
    public AnomalyCoding? Coding { get; set; }
    public ICollection<ErrorReport> ErrorReports { get; set; } = [];
}
