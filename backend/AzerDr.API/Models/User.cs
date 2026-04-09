using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Role { get; set; } = "doctor"; // "admin" or "doctor"

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<AnomalyCoding> Codings { get; set; } = [];
    public ICollection<ErrorReport> ErrorReports { get; set; } = [];
}
