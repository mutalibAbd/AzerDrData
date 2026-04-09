using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class IcdQeyd
{
    [Key]
    public int Id { get; set; }
    public int DiaqnozId { get; set; }

    [Required, MaxLength(300)]
    public string Name { get; set; } = string.Empty;

    public IcdDiaqnoz Diaqnoz { get; set; } = null!;
}
