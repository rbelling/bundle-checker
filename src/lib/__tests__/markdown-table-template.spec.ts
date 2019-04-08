import { template as markdownTableTemplate } from '../markdown-table-template';

describe('generating markdown tables', () => {
  it('build a markdown table with the content given', () => {
    const headers = ['', 'Warnings'];
    const rows = [
      ['⚠️', 'This is a very unimportant warning.'],
      ['⚠️', 'But, this warning is pretty important.']
    ];

    const table = markdownTableTemplate(headers, rows);

    expect(table).toMatchSnapshot();
  });
});
