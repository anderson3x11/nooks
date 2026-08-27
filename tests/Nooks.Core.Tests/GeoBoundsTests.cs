using Nooks.Core.Common;

namespace Nooks.Core.Tests;

public class GeoBoundsTests
{
    [Fact]
    public void Un_bbox_valide_est_lu_dans_lordre_lon_lat()
    {
        var parsed = GeoBounds.TryParse("2.20,48.80,2.45,48.92", out var bounds, out var error);

        Assert.True(parsed);
        Assert.Null(error);
        Assert.Equal(2.20, bounds.MinLon);
        Assert.Equal(48.80, bounds.MinLat);
        Assert.Equal(2.45, bounds.MaxLon);
        Assert.Equal(48.92, bounds.MaxLat);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2.20,48.80,2.45")]
    [InlineData("a,b,c,d")]
    public void Un_bbox_malforme_est_refuse(string? value)
    {
        Assert.False(GeoBounds.TryParse(value, out _, out var error));
        Assert.NotNull(error);
    }

    [Fact]
    public void Un_bbox_inverse_est_refuse()
    {
        Assert.False(GeoBounds.TryParse("2.45,48.92,2.20,48.80", out _, out var error));
        Assert.Contains("sud-ouest", error);
    }

    [Fact]
    public void Un_bbox_trop_grand_est_refuse()
    {
        Assert.False(GeoBounds.TryParse("-40,-40,40,40", out _, out var error));
        Assert.Contains("trop grande", error);
    }

    [Fact]
    public void Une_vue_sur_la_France_entiere_est_acceptee()
    {
        // Environ 120 degrés carrés : c'est le dézoom naturel d'une carte nationale.
        Assert.True(GeoBounds.TryParse("-5,42,10,52", out _, out var error));
        Assert.Null(error);
    }

    [Fact]
    public void Une_latitude_hors_bornes_est_refusee()
    {
        Assert.False(GeoBounds.TryParse("2.20,-95,2.45,48.92", out _, out var error));
        Assert.Contains("latitudes", error);
    }

    [Fact]
    public void Le_polygone_porte_le_srid_wgs84()
    {
        Assert.True(GeoBounds.TryParse("2.20,48.80,2.45,48.92", out var bounds, out _));

        var polygon = bounds.ToPolygon();

        Assert.Equal(GeoConstants.WgsSrid, polygon.SRID);
        Assert.Equal(2.20, polygon.EnvelopeInternal.MinX);
        Assert.Equal(48.92, polygon.EnvelopeInternal.MaxY);
    }
}
