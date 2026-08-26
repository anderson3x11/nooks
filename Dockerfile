# Une seule image : le site Angular construit puis déposé dans l'API, qui le sert
# elle-même. Un conteneur à déployer au lieu de deux, et plus rien à coordonner
# entre le front et l'API puisqu'ils partagent la même origine.

# --- 1. Le site Angular -------------------------------------------------------
FROM node:24-alpine AS client
WORKDIR /client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# --- 2. L'API -----------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Les fichiers projet d'abord : tant qu'ils ne changent pas, la restauration reste en cache.
COPY Nooks.slnx ./
COPY src/Nooks.Core/Nooks.Core.csproj src/Nooks.Core/
COPY src/Nooks.Infrastructure/Nooks.Infrastructure.csproj src/Nooks.Infrastructure/
COPY src/Nooks.Api/Nooks.Api.csproj src/Nooks.Api/
RUN dotnet restore src/Nooks.Api/Nooks.Api.csproj

COPY src/ src/
RUN dotnet publish src/Nooks.Api/Nooks.Api.csproj -c Release -o /app --no-restore

# --- 3. L'image finale --------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# SkiaSharp a besoin des bibliothèques natives de rendu, absentes de l'image de base.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app ./
COPY --from=client /client/dist/client/browser ./wwwroot/

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Nooks.Api.dll"]
