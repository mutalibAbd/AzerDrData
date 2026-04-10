using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class ErrorReport
{
    [Key]
    public int Id { get; set; }

    public int AnomalyId { get; set; }
    public Guid DoctorId { get; set; }

    [Required, MaxLength(20)]
    public string ErrorType { get; set; } = "spelling"; // "spelling" or "logic"

    [MaxLength(20)]
    public string? FieldName { get; set; } // "diagnosis" or "explanation" (for spelling errors)

    public string? CorrectedText { get; set; } // for spelling errors

    public string? Description { get; set; } // for logic errors

    public string? Note { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "pending"; // pending, reviewed, accepted, rejected

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Anomaly Anomaly { get; set; } = null!;
    public User Doctor { get; set; } = null!;
}
