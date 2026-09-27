#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

rm -rf TestResults

dotnet test --solution NotesApp.slnx -c Release \
    --results-directory TestResults \
    -- \
    --coverage \
    --coverage-output-format cobertura \
    --coverage-settings CodeCoverage.runsettings

dotnet tool restore

dotnet reportgenerator \
    -reports:"TestResults/**/*.cobertura.xml" \
    -targetdir:"TestResults/coveragereport" \
    -reporttypes:Html \
    -filefilters:"-*/obj/*"

echo "Coverage report: $(pwd)/TestResults/coveragereport/index.html"
