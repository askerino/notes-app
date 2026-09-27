using Xunit;

namespace NotesApp.Api.Tests.Integration;

[CollectionDefinition(Name)]
public sealed class IntegrationCollectionDefinition : ICollectionFixture<ApiWebApplicationFactory>
{
    public const string Name = "Integration";
}
