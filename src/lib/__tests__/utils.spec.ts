import { IFileSizeReport, ITableRow } from '../../../types/bundle-checker-types';
import {
  createMarkdownTable,
  getFormattedRows,
  groupFilesByExtension,
  normalizeSlugsInFileNames,
  squashReportByFileExtension,
  withDeltaSize
} from '../utils';
describe('generating markdown tables', () => {
  it('build a markdown table with the content given', () => {
    const headers = ['git branch', 'base branch', 'current branch'] as ITableRow;
    const rows = [
      ['__tests__/file1.spec.js', '356.6kB', '320KB'],
      ['file2.css', '320kB', '330KB']
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
      '.css': ['main.css', 'shared.css'],
      '.js': ['main.js', 'shared.js'],
      '.png': ['sprite.png'],
      '.woff': ['font.woff', 'font-italic.123716.woff']
    };

    expect(groupFilesByExtension(targetedFiles)).toMatchObject(expectedGrouping);
  });

  it(`Prints the delta size with a triangle arrow`, () => {
    expect(withDeltaSize(1024, 2048)).toBe(`2KB (🔺 +1KB)`);
    expect(withDeltaSize(2048, 512)).toBe(`512B (▼ -1.5KB)`);
  });

  it('Creates rows for total size report in the expected format', () => {
    const targetBranchReport: IFileSizeReport = {
      '.css': 150,
      '.jpg': 2000,
      '.js': 1000,
      '.svg': 170,
      '.woff': 2500
    };
    const currentBranchReport: IFileSizeReport = {
      '.jpg': 2000,
      '.js': 1100,
      '.svg': 170
    };
    const expectedFormat: ITableRow[] = [
      ['.woff', '0B (▼ -2.44KB)', '2.44KB'],
      ['.css', '0B (▼ -150B)', '150B'],
      ['.js', '1.07KB (🔺 +100B)', '1000B'],
      ['.jpg', '1.95KB', '1.95KB'],
      ['.svg', '170B', '170B']
    ];

    expect(getFormattedRows({ targetBranchReport, currentBranchReport })).toEqual(expectedFormat);
  });

  describe('Squashes a File report by extension', () => {
    const input: IFileSizeReport = {
      'a.js': 1000,
      'b.js': 2000,
      'c.css': 1500,
      'd.css': 3000,
      'e.jpeg': 2000
    };
    const expectedOutput = {
      '.css': 4500,
      '.jpeg': 2000,
      '.js': 3000
    };

    expect(squashReportByFileExtension(input)).toMatchObject(expectedOutput);
  });

  it('Is able to replace an ellipsis to each dot-separated slug', () => {
    const input = {
      '/build/commands/a.1fasd123.js': 2550,
      '/build/lib/1.zf87zlkx.3gaqd329.js': 187,
      '/build/lib/utils.3gaqd329.css': 3037,
      '/build/z/nohash.js': 150,
      '/build/z/slugs.another.123123123.js': 300
    };
    const expectedOutput = {
      '/build/commands/a.[…].js': 2550,
      '/build/lib/1.[…].[…].js': 187,
      '/build/lib/utils.[…].css': 3037,
      '/build/z/nohash.js': 150,
      '/build/z/slugs.[…].[…].js': 300
    };

    expect(normalizeSlugsInFileNames(input)).toMatchObject(expectedOutput);
  });

  it('Leaves `.min` and `.MIN` unaltered in the final report', () => {
    const input = {
      '/build/z/shared.min.js': 300,
      '/build/z/utils.zj67zjkx.MIN.zf87zlkl.js': 310,
      'app.min.ajh76yu.js': 415
    };
    const expectedOutput = {
      '/build/z/shared.min.js': 300,
      '/build/z/utils.[…].MIN.[…].js': 310,
      'app.min.[…].js': 415
    };

    expect(normalizeSlugsInFileNames(input)).toMatchObject(expectedOutput);
  });
});
