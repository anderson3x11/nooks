using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nooks.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSuspectedDuplicate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SuspectedDuplicate",
                table: "Places",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SuspectedDuplicate",
                table: "Places");
        }
    }
}
