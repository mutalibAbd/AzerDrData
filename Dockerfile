FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY backend/AzerDr.API/AzerDr.API.csproj ./
RUN dotnet restore
COPY backend/AzerDr.API/ ./
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:${PORT:-5000}
EXPOSE 5000
ENTRYPOINT ["dotnet", "AzerDr.API.dll"]
