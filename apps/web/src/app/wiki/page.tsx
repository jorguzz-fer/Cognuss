import type { Metadata } from 'next';
import { WIKI } from '@/features/wiki/content.generated';
import { WikiMarkdown } from '@/features/wiki/render';

export const metadata: Metadata = { title: 'Wiki' };

export default function WikiHome() {
  return <WikiMarkdown source={WIKI.README ?? ''} from="README" />;
}
