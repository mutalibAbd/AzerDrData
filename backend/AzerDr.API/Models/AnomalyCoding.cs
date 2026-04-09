using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class AnomalyCoding
{
    [Key]
    public int Id { get; set; }

    public int AnomalyId { get; set; }
    public Guid DoctorId { get; set; }

    [MaxLength(50)]
    public string RubrikaCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string RubrikaName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string BashliqCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string BashliqName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DiaqnozCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string DiaqnozName { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? IcdQeydName { get; set; }

    public string? Qeyd { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Anomaly Anomaly { get; set; } = null!;
    public User Doctor { get; set; } = null!;
}
