using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class DoctorSkip
{
    [Key]
    public int Id { get; set; }
    public Guid DoctorId { get; set; }
    public int AnomalyId { get; set; }
    public DateTime SkippedAt { get; set; } = DateTime.UtcNow;

    public User Doctor { get; set; } = null!;
    public Anomaly Anomaly { get; set; } = null!;
}
