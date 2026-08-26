namespace Nooks.Infrastructure.Persistence;

public static class ConnectionString
{
    /// <summary>
    /// Les hébergeurs fournissent la base sous forme d'URL (postgres://user:pass@hote/base),
    /// format que Npgsql ne comprend pas. On la traduit ici pour que la variable DATABASE_URL
    /// branchée automatiquement par l'hébergeur suffise, sans rien recopier à la main.
    /// </summary>
    public static string Normalize(string value)
    {
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var uri = new Uri(value);
        var credentials = uri.UserInfo.Split(':', 2);

        var builder = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(credentials[0]),
            Password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : null,
            // Les bases gérées imposent toutes TLS, avec un certificat que l'image .NET
            // ne sait pas toujours valider : on chiffre sans exiger la chaîne complète.
            SslMode = Npgsql.SslMode.Require,
            TrustServerCertificate = true,
        };

        return builder.ConnectionString;
    }
}
