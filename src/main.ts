import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/app.css';
import content from './content/partA.json';
import type { PartContent } from './content/schema';
import { App } from './engine/app';

const root = document.getElementById('app')!;
const app = new App(root, content as unknown as PartContent);
void app.start();
if (import.meta.env.DEV) (window as unknown as { __mm: App }).__mm = app;
