export default function Reports() {

  const exportCSV = () => {
    const rows = document.querySelectorAll("table tr");
    let csv: string[] = [];

    rows.forEach((row) => {
      const cols = row.querySelectorAll("td, th");
      let data: string[] = [];

      cols.forEach(col => data.push(col.textContent || ""));
      csv.push(data.join(","));
    });

    const blob = new Blob([csv.join("\n")]);
    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);
    a.download = "attendance_report.csv";
    a.click();
  };

  return (
    <div className="container">
      <h2>Attendance Reports</h2>

      <button className="export-btn" onClick={exportCSV}>
        Export to CSV
      </button>

      <table>
        <thead>
          <tr>
            <th>Enrollment No.</th>
            <th>Name</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>A123</td>
            <td>John Doe</td>
            <td className="present">Present</td>
            <td>10:12 AM</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}