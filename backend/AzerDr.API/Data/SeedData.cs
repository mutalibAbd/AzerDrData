using System.Text.Json;
using System.Text.Json.Serialization;
using AzerDr.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzerDr.API.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db, string dataPath)
    {
        await db.Database.EnsureCreatedAsync();

        // Seed admin user if no users exist
        if (!await db.Users.AnyAsync())
        {
            db.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "System Admin",
                Role = "admin"
            });
            await db.SaveChangesAsync();
        }

        // Seed ICD hierarchy
        if (!await db.IcdRubrikas.AnyAsync())
        {
            var icdJson = await File.ReadAllTextAsync(Path.Combine(dataPath, "icd10_hierarchy.json"));
            var rubrikas = JsonSerializer.Deserialize<List<IcdRubrikaJson>>(icdJson, JsonOpts)!;

            int bashliqAutoId = 1;
            int diaqnozAutoId = 1;

            foreach (var r in rubrikas)
            {
                var rubrika = new IcdRubrika
                {
                    Id = r.Id + 1, // 1-based
                    Code = r.Code,
                    Name = r.Name
                };
                db.IcdRubrikas.Add(rubrika);

                foreach (var b in r.Bashliqlar)
                {
                    var bashliq = new IcdBashliq
                    {
                        Id = bashliqAutoId++,
                        RubrikaId = rubrika.Id,
                        Code = b.Code,
                        Name = b.Name
                    };
                    db.IcdBashliqlar.Add(bashliq);

                    foreach (var d in b.Diaqnozlar)
                    {
                        // Skip placeholder entries (single dots)
                        if (string.IsNullOrWhiteSpace(d.Code) || d.Code == ".")
                            continue;

                        db.IcdDiaqnozlar.Add(new IcdDiaqnoz
                        {
                            Id = diaqnozAutoId++,
                            BashliqId = bashliq.Id,
                            Code = d.Code,
                            Name = d.Name
                        });
                    }
                }
            }
            await db.SaveChangesAsync();
        }

        // Seed anomalies
        if (!await db.Anomalies.AnyAsync())
        {
            var anomalyJson = await File.ReadAllTextAsync(Path.Combine(dataPath, "anomalies.json"));
            var anomalies = JsonSerializer.Deserialize<List<AnomalyJson>>(anomalyJson, JsonOpts)!;

            foreach (var batch in anomalies.Chunk(500))
            {
                foreach (var a in batch)
                {
                    db.Anomalies.Add(new Anomaly
                    {
                        Id = a.Id + 1, // 1-based
                        ReportId = a.ReportId,
                        PatientId = a.PatientId,
                        Date = DateOnly.Parse(a.Date),
                        Diagnosis = a.Diagnosis ?? "",
                        Explanation = a.Explanation ?? "",
                        Status = "pending"
                    });
                }
                await db.SaveChangesAsync();
            }
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    // JSON deserialization models
    private record IcdRubrikaJson(int Id, string Code, string Name, List<IcdBashliqJson> Bashliqlar);
    private record IcdBashliqJson(int Id, string Code, string Name, List<IcdDiaqnozJson> Diaqnozlar);
    private record IcdDiaqnozJson(int Id, string Code, string Name);
    private record AnomalyJson(int Id, string ReportId, string PatientId, string Date, string? Diagnosis, string? Explanation, bool Coded);
}
