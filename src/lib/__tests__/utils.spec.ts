import { ITableReport, ITableRow } from '../../../types/bundle-checker-types';
import { createMarkdownTable, getRowsForTotalSizeReport, groupByFileExtension } from '../utils';

describe('generating markdown tables', () => {
  it('build a markdown table with the content given', () => {
    const headers = ['git branch', 'file size'] as ITableRow;
    const rows = [
      ['master️', 'js: 356.6kB, css: 0'],
      ['develop', 'js: 376.4kB, css: 0']
    ] as ITableRow[];

    const table = createMarkdownTable([headers, ...rows]);

    expect(table).toMatchSnapshot();
  });

  it('Groups targeted files by extension', () => {
    const targetedFiles = [
      'main.js',
      'main.css',
      'shared.js',
      'shared.css',
      'sprite.png',
      'font.woff',
      'font-italic.123716.woff'
    ];
    const expectedGrouping = {
      css: ['main.css', 'shared.css'],
      js: ['main.js', 'shared.js'],
      png: ['sprite.png'],
      woff: ['font.woff', 'font-italic.123716.woff']
    };

    expect(groupByFileExtension(targetedFiles)).toMatchObject(expectedGrouping);
  });
});
