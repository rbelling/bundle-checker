import { danger, markdown, message, warn } from 'danger';

warn('This is a warning');
message('This is a normal message');
markdown('*Markdown* is also **supported**');

const { additions = 0, deletions = 0 } = danger.github.pr;
message(`:tada: The PR added ${additions} and removed ${deletions} lines.`);
