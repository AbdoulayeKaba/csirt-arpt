import type ExcelJSType from 'exceljs';
import ExcelJSRuntime from 'exceljs/dist/exceljs.min.js';

const ExcelJS = (ExcelJSRuntime as { default?: typeof ExcelJSType }).default ?? ExcelJSRuntime;

export default ExcelJS as typeof ExcelJSType;
