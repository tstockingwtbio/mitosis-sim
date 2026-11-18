import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/app.css';
import partA from './content/partA.json';
import partB from './content/partB.json';
import type { PartContent } from './content/schema';
import { mergeParts } from './content/merge';
import { App } from './engine/app';

const root = document.getElementById('app')!;
const content = mergeParts(partA as unknown as PartContent, partB as unknown as PartContent);
const app = new App(root, content);
void app.start();
if (import.meta.env.DEV) (window as unknown as { __mm: App }).__mm = app;
