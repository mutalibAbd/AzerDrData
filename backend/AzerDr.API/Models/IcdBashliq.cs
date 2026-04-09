using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class IcdBashliq
{
    [Key]
    public int Id { get; set; }

    public int RubrikaId { get; set; }

    [Required, MaxLength(200)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Navigation
    public IcdRubrika Rubrika { get; set; } = null!;
    public ICollection<IcdDiaqnoz> Diaqnozlar { get; set; } = [];
}
