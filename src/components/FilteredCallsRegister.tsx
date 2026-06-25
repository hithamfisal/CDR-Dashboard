import { memo } from "react";
import { ArrowUp } from "lucide-react";
import type { CallRecord } from "../types/dashboard";

type FilteredCallsRegisterProps = {
  id?: string;
  records: CallRecord[];
  totalFiltered: number;
  totalRecords: number;
  page: number;
  pageCount: number;
  showTopButton?: boolean;
  title?: string;
  eyebrow?: string;
  formatNumber: (value: number) => string;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

function FilteredCallsRegisterComponent({
  id,
  records,
  totalFiltered,
  totalRecords,
  page,
  pageCount,
  showTopButton = false,
  title = "Filtered Calls Register",
  eyebrow = "CDR View",
  formatNumber,
  onPreviousPage,
  onNextPage,
}: FilteredCallsRegisterProps) {
  return (
    <article id={id} className="records-card reports-cdr-register">
      <div className="section-title reports-register-title">
        <div className="section-title-heading">
          <div className="section-title-copy">
            <p>{eyebrow}</p>
            <h2>{title}</h2>
            <span>{formatNumber(totalFiltered)} filtered rows from {formatNumber(totalRecords)} source rows.</span>
          </div>
        </div>
        {showTopButton && (
          <div className="section-title-actions">
            <button className="button small section-top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <ArrowUp size={15} />
              <span>Top</span>
            </button>
          </div>
        )}
      </div>
      <div className="records-scroll records-scroll-fixed-register fixed-row-table">
        <table className="filtered-register-table">
          <colgroup>
            <col className="col-sn" />
            <col className="col-radio-id" />
            <col className="col-radio-alias" />
            <col className="col-radio-type" />
            <col className="col-employee-name" />
            <col className="col-employee-id" />
            <col className="col-region" />
            <col className="col-company" />
            <col className="col-talkgroup" />
            <col className="col-start" />
            <col className="col-end" />
            <col className="col-duration" />
            <col className="col-base-station" />
          </colgroup>
          <thead>
            <tr>
              <th>SN</th><th>Radio ID</th><th>Radio Alias</th><th>Radio Type</th><th>Employee Name</th><th>Employee ID</th><th>Region</th><th>Company</th><th>Talkgroup Alias</th><th>Start Time</th><th>End Time</th><th>Duration (s)</th><th>Base Station</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={`${id ?? "cdr"}-${record.radioId}-${index}`}>
                <td>{(page - 1) * 50 + index + 1}</td>
                <td>{record.radioId}</td>
                <td>{record.radioAlias}</td>
                <td>{record.mobileType}</td>
                <td>{record.employeeName}</td>
                <td>{record.employeeId}</td>
                <td>{record.region}</td>
                <td>{record.company}</td>
                <td>{record.talkgroup}</td>
                <td>{record.startTime}</td>
                <td>{record.endTime}</td>
                <td>{formatNumber(record.durationSeconds)}</td>
                <td>{record.baseStation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button className="button" disabled={page <= 1} onClick={onPreviousPage}>Previous</button>
        <span>Page {formatNumber(page)} of {formatNumber(pageCount)} - showing {formatNumber(records.length)} rows</span>
        <button className="button" disabled={page >= pageCount} onClick={onNextPage}>Next</button>
      </div>
    </article>
  );
}

export const FilteredCallsRegister = memo(FilteredCallsRegisterComponent);
