import { Column } from "@silevis/reactgrid";

export const columns = (reorderable: boolean, resizable: boolean): Column[] => [
  { columnId: "id", reorderable, resizable, width: 200},
  { columnId: "hash", reorderable, resizable, width: 400 },
  { columnId: "test", reorderable, resizable, width: 400 }
];
