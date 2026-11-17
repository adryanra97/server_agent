import Quality from '../../../components/quality';
import { resolveQualityBranch } from '../../../lib/quality-branch';

// Git branch is set at build time by Vercel. Local builds continue to
// display production evidence, never an invented or hard-coded test total.
export default function Page(){
  const branch=resolveQualityBranch(process.env.VERCEL_GIT_COMMIT_REF);
  return <Quality branch={branch}/>;
}
