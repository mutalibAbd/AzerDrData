using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class IcdRubrika
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Navigation
    public ICollection<IcdBashliq> Bashliqlar { get; set; } = [];
}
