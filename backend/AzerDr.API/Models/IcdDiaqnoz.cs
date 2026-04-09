using System.ComponentModel.DataAnnotations;

namespace AzerDr.API.Models;

public class IcdDiaqnoz
{
    [Key]
    public int Id { get; set; }

    public int BashliqId { get; set; }

    [Required, MaxLength(200)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    // Navigation
    public IcdBashliq Bashliq { get; set; } = null!;
    public List<IcdQeyd> Qeydler { get; set; } = new();
}
