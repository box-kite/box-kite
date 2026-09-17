import raw from '../../bench/results.json';
import { BenchResults } from './benchModel';

/**
 * The committed measurement the page prints beside the Run button, written by `npm run bench`. A JSON
 * import widens every string, so the shape is asserted once here rather than at each read.
 */
const referenceResults = raw as BenchResults;

export default referenceResults;
