import { Column } from "@silevis/reactgrid";

export const columns = (reorderable: boolean, resizable: boolean): Column[] => [
  { columnId: "id", reorderable, resizable, width: 100},
  { columnId: "hash", reorderable, resizable, width: 400 },
  { columnId: "test", reorderable, resizable, width: 400 }
];
