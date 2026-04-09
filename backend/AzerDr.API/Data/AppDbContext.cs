using Microsoft.EntityFrameworkCore;
using AzerDr.API.Models;

namespace AzerDr.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Anomaly> Anomalies => Set<Anomaly>();
    public DbSet<AnomalyCoding> AnomalyCodings => Set<AnomalyCoding>();
    public DbSet<ErrorReport> ErrorReports => Set<ErrorReport>();
    public DbSet<IcdRubrika> IcdRubrikas => Set<IcdRubrika>();
    public DbSet<IcdBashliq> IcdBashliqlar => Set<IcdBashliq>();
    public DbSet<IcdDiaqnoz> IcdDiaqnozlar => Set<IcdDiaqnoz>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // User
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasIndex(u => u.Username).IsUnique();
        });

        // Anomaly
        modelBuilder.Entity<Anomaly>(e =>
        {
            e.ToTable("anomalies");
            e.HasIndex(a => a.Status);
            e.HasIndex(a => a.AssignedTo);
            e.HasIndex(a => a.PatientId);

            e.HasOne(a => a.AssignedDoctor)
                .WithMany()
                .HasForeignKey(a => a.AssignedTo)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(a => a.CodingDoctor)
                .WithMany()
                .HasForeignKey(a => a.CodedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // AnomalyCoding
        modelBuilder.Entity<AnomalyCoding>(e =>
        {
            e.ToTable("anomaly_codings");
            e.HasIndex(c => c.AnomalyId).IsUnique();

            e.HasOne(c => c.Anomaly)
                .WithOne(a => a.Coding)
                .HasForeignKey<AnomalyCoding>(c => c.AnomalyId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.Doctor)
                .WithMany(u => u.Codings)
                .HasForeignKey(c => c.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ErrorReport
        modelBuilder.Entity<ErrorReport>(e =>
        {
            e.ToTable("error_reports");

            e.HasOne(er => er.Anomaly)
                .WithMany(a => a.ErrorReports)
                .HasForeignKey(er => er.AnomalyId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(er => er.Doctor)
                .WithMany(u => u.ErrorReports)
                .HasForeignKey(er => er.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ICD Hierarchy
        modelBuilder.Entity<IcdRubrika>(e =>
        {
            e.ToTable("icd_rubrikas");
        });

        modelBuilder.Entity<IcdBashliq>(e =>
        {
            e.ToTable("icd_bashliqlar");

            e.HasOne(b => b.Rubrika)
                .WithMany(r => r.Bashliqlar)
                .HasForeignKey(b => b.RubrikaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IcdDiaqnoz>(e =>
        {
            e.ToTable("icd_diaqnozlar");

            e.HasOne(d => d.Bashliq)
                .WithMany(b => b.Diaqnozlar)
                .HasForeignKey(d => d.BashliqId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
