param([switch]$ConfirmReset)

$ErrorActionPreference = 'Stop'
if (-not $ConfirmReset) {
    throw 'This deletes the omnicare development database. Run with -ConfirmReset only for disposable data.'
}

$ComposeFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'docker-compose.yml'
function Invoke-Compose {
    param([string[]]$DockerArguments)
    & docker compose -f $ComposeFile @DockerArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose command failed with exit code $LASTEXITCODE. Reset stopped."
    }
}

$Configuration = Invoke-Compose -DockerArguments @('config', '--format', 'json') | ConvertFrom-Json
if ($Configuration.services.backend.environment.ENVIRONMENT -ne 'development' -or
    $Configuration.services.postgres.environment.POSTGRES_DB -ne 'omnicare' -or
    $Configuration.services.postgres.environment.POSTGRES_USER -ne 'omnicare') {
    throw 'Refusing reset: expected the omnicare development database/user configuration.'
}
$DatabaseUrl = [uri]$Configuration.services.backend.environment.DATABASE_URL
if ($DatabaseUrl.Host -ne 'postgres' -or $DatabaseUrl.AbsolutePath -ne '/omnicare') {
    throw 'Refusing reset: backend must target postgres/omnicare in this Compose project.'
}

Invoke-Compose -DockerArguments @('build', 'backend')
Invoke-Compose -DockerArguments @('run', '--rm', '--no-deps', 'backend', 'python',
    '-m', 'unittest', 'discover', '-s', 'tests/unit', '-p', 'test_combined_initial_migration.py', '-v')
Invoke-Compose -DockerArguments @('run', '--rm', '--no-deps', 'backend', 'python', '-c',
    'import app.modules.auth.models, app.modules.organisations.models, app.modules.clients.models, app.modules.caregivers.models, app.modules.family.models, app.modules.scheduling.models, app.modules.tasks.models, app.modules.medications.models, app.modules.assessments.models, app.modules.emergency.models; from sqlalchemy.orm import configure_mappers; configure_mappers()')
Write-Output 'Model mappers configured.'

Invoke-Compose -DockerArguments @('up', '-d', '--wait', 'postgres', 'redis')
Invoke-Compose -DockerArguments @('stop', 'backend')
Write-Output 'Deleting the authorized disposable omnicare PostgreSQL database. Other Docker volumes are untouched.'
Invoke-Compose -DockerArguments @('exec', '-T', 'postgres', 'dropdb', '-U', 'omnicare',
    '--if-exists', '--force', 'omnicare')
Invoke-Compose -DockerArguments @('exec', '-T', 'postgres', 'createdb', '-U', 'omnicare',
    '-O', 'omnicare', 'omnicare')
Invoke-Compose -DockerArguments @('run', '--rm', 'backend', 'alembic',
    '-x', 'seed_demo=true', 'upgrade', 'head')
Invoke-Compose -DockerArguments @('run', '--rm', 'backend', 'alembic', 'current')
Invoke-Compose -DockerArguments @('exec', '-T', 'postgres', 'psql', '-U', 'omnicare',
    '-d', 'omnicare', '-c',
    'SELECT version_num FROM alembic_version; SELECT count(*) AS users FROM users; SELECT count(*) AS clients FROM clients; SELECT count(*) AS assessments FROM assessments;')
Write-Output 'Database reset and seed complete. Backend remains stopped for inspection.'