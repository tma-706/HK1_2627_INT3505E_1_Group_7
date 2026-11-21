import csv
from pathlib import Path

from locust import events
from locust.stats import PERCENTILES_TO_REPORT, StatsCSV


@events.quitting.add_listener
def write_final_csv(environment, **_kwargs):
    # Periodic CSVs can miss requests that finish just before shutdown.
    csv_prefix = environment.parsed_options.csv_prefix
    if not csv_prefix:
        return
    stats = StatsCSV(environment, PERCENTILES_TO_REPORT)
    reports = {"stats": stats.requests_csv, "failures": stats.failures_csv, "exceptions": stats.exceptions_csv}
    for name, write_report in reports.items():
        with Path(f"{csv_prefix}_final_{name}.csv").open("w", encoding="utf-8", newline="") as report:
            write_report(csv.writer(report))
