import { IBundleCheckerReportRow } from '../../../types/bundle-checker-types';
import generateReportTable from '../markdown-table-template';

describe('generating markdown tables', () => {
  it('build a markdown table with the content given', () => {
    const headers = ['git branch', 'file size'] as IBundleCheckerReportRow;
    const rows = [
      ['master️', 'js: 356.6kB, css: 0'],
      ['develop', 'js: 376.4kB, css: 0']
    ] as IBundleCheckerReportRow[];

    const table = generateReportTable([headers, ...rows]);

    expect(table).toMatchSnapshot();
  });
});
