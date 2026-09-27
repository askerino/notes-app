using System.Globalization;
using DotNetEnv;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using NotesApp.Api.Data;
using NotesApp.Api.Data.Seeding;
using NotesApp.Api.ExceptionHandling;
using NotesApp.Api.Features.Notes;
using Npgsql;
using Scalar.AspNetCore;
using Serilog;

if (string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase))
{
    Env.NoClobber().TraversePath().Load();
}

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog((services, logger) => logger
    .ReadFrom.Configuration(builder.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture));

bool seedSampleData = builder.Configuration.GetValue<bool>("SEED_SAMPLE_DATA");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options
        .UseNpgsql(GetAppDatabaseConnectionString(builder.Configuration))
        .UseSnakeCaseNamingConvention();
    if (seedSampleData)
    {
        options
            .UseSeeding((dbContext, _) => SampleNoteSeeder.Seed(dbContext, TimeProvider.System))
            .UseAsyncSeeding((dbContext, _, cancellationToken) => SampleNoteSeeder.SeedAsync(dbContext, TimeProvider.System, cancellationToken));
    }
});

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddProblemDetails(options => options
    .CustomizeProblemDetails = context =>
        {
            context.ProblemDetails.Title = context.ProblemDetails switch
            {
                HttpValidationProblemDetails => "入力内容に誤りがあります。",
                { Status: StatusCodes.Status400BadRequest } => "リクエストが不正です。",
                _ => "予期しないエラーが発生しました。",
            };
        });
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("postgresql");

WebApplication app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.MapOpenApi();
    app.MapScalarApiReference();

    await using AsyncServiceScope scope = app.Services.CreateAsyncScope();
    AppDbContext dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready");

app.MapNoteEndpoints();

await app.RunAsync();

// Docker Compose and E2E tests use ConnectionStrings:AppDatabase.
// For local development, the connection string is built from the POSTGRES_* values in .env.
static string GetAppDatabaseConnectionString(IConfiguration configuration)
{
    string? connectionString = configuration.GetConnectionString("AppDatabase");
    if (!string.IsNullOrEmpty(connectionString))
    {
        return connectionString;
    }

    string[] keys = ["POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"];
    string[] missingKeys = [.. keys.Where(key => string.IsNullOrEmpty(configuration[key]))];
    if (missingKeys.Length > 0)
    {
        throw new InvalidOperationException(
            "The database connection is not configured. " +
            $"Configure ConnectionStrings:AppDatabase, or set all of the following environment variables: {string.Join(", ", missingKeys)}. " +
            "For local development, copy .env.example to .env.");
    }

    return new NpgsqlConnectionStringBuilder
    {
        Host = "127.0.0.1",
        Port = configuration.GetValue<int>("POSTGRES_PORT"),
        Database = configuration["POSTGRES_DB"],
        Username = configuration["POSTGRES_USER"],
        Password = configuration["POSTGRES_PASSWORD"],
    }.ConnectionString;
}
