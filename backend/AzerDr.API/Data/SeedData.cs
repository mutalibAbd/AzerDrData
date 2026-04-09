using System.Text.Json;
using System.Text.Json.Serialization;
using AzerDr.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzerDr.API.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db, string dataPath)
    {
        Console.WriteLine("[Seed] Starting database seed...");
        await db.Database.EnsureCreatedAsync();
        Console.WriteLine("[Seed] EnsureCreatedAsync done.");

        // Seed admin user if no users exist
        if (!await db.Users.AnyAsync())
        {
            Console.WriteLine("[Seed] Creating admin user...");
            db.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "System Admin",
                Role = "admin"
            });
            await db.SaveChangesAsync();
            Console.WriteLine("[Seed] Admin user created.");
        }

        // Seed ICD hierarchy
        if (!await db.IcdRubrikas.AnyAsync())
        {
            Console.WriteLine("[Seed] Loading ICD hierarchy...");
            var icdJson = await File.ReadAllTextAsync(Path.Combine(dataPath, "icd10_hierarchy.json"));
            var rubrikas = JsonSerializer.Deserialize<List<IcdRubrikaJson>>(icdJson, JsonOpts)!;
            Console.WriteLine($"[Seed] Deserialized {rubrikas.Count} rubrikas.");

            int bashliqAutoId = 1;
            int diaqnozAutoId = 1;
            int qeydAutoId = 1;

            foreach(var r in rubrikas)
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
                            Id = diaqnozAutoId,
                            BashliqId = bashliq.Id,
                            Code = d.Code,
                            Name = d.Name
                        });

                        if (d.Qeydlər != null)
                        {
                            foreach (var q in d.Qeydlər)
                            {
                                db.IcdQeydler.Add(new IcdQeyd
                                {
                                    Id = qeydAutoId++,
                                    DiaqnozId = diaqnozAutoId,
                                    Name = q.Name
                                });
                            }
                        }

                        diaqnozAutoId++;
                    }
                }
            }
            await db.SaveChangesAsync();
            Console.WriteLine($"[Seed] ICD hierarchy saved. Bashliqlar: {bashliqAutoId - 1}, Diaqnozlar: {diaqnozAutoId - 1}, Qeydlər: {qeydAutoId - 1}");
        }

        // Seed anomalies
        if (!await db.Anomalies.AnyAsync())
        {
            Console.WriteLine("[Seed] Loading anomalies...");
            var anomalyJson = await File.ReadAllTextAsync(Path.Combine(dataPath, "anomalies.json"));
            var anomalies = JsonSerializer.Deserialize<List<AnomalyJson>>(anomalyJson, JsonOpts)!;
            Console.WriteLine($"[Seed] Deserialized {anomalies.Count} anomalies.");

            int batchNum = 0;
            foreach (var batch in anomalies.Chunk(500))
            {
                batchNum++;
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
                Console.WriteLine($"[Seed] Anomaly batch {batchNum} saved ({batch.Length} records).");
            }
            Console.WriteLine("[Seed] All anomalies seeded.");
        }

        Console.WriteLine("[Seed] Seed complete!");
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    // JSON deserialization models
    private record IcdRubrikaJson(int Id, string Code, string Name, List<IcdBashliqJson> Bashliqlar);
    private record IcdBashliqJson(int Id, string Code, string Name, List<IcdDiaqnozJson> Diaqnozlar);
    private record IcdDiaqnozJson(int Id, string Code, string Name, List<IcdQeydJson>? Qeydlər);
    private record IcdQeydJson(int Id, string Name);
    private record AnomalyJson(int Id, string ReportId, string PatientId, string Date, string? Diagnosis, string? Explanation, bool Coded);
}
