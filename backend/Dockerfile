FROM mcr.microsoft.com/dotnet/sdk:10.0.400 AS build
WORKDIR /src

COPY src/NotesApp.Api/NotesApp.Api.csproj src/NotesApp.Api/
RUN dotnet restore src/NotesApp.Api/NotesApp.Api.csproj

COPY . .
RUN dotnet publish src/NotesApp.Api/NotesApp.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0.11 AS final
WORKDIR /app

COPY --from=build /app/publish .

USER app
EXPOSE 8080

ENTRYPOINT ["dotnet", "NotesApp.Api.dll"]
