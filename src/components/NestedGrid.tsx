import React, { useState } from "react";
import { columns as dataColumns } from "../data/columns";
import { rows as dataRows, headerRow } from "../data/rows";
import { CellChange, ChevronCell, Column, ReactGrid, Row, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import "./styles.scss";
import { v4 as uuidv4 } from 'uuid';

/* 
  searches for a chevron cell in given row
*/
const findChevronCell = (row: Row) =>
  row.cells.find((cell) => cell.type === "chevron") as ChevronCell | undefined;

/* 
  searches for a parent of given row
*/
const findParentRow = (rows: Row[], row: Row) =>
  rows.find((r) => {
    const foundChevronCell = findChevronCell(row);
    return foundChevronCell ? r.rowId === foundChevronCell.parentId : false;
  });

/* 
  check if the row has children
*/
const hasChildren = (rows: Row[], row: Row): boolean =>
  rows.some((r) => {
    const foundChevronCell = findChevronCell(r);
    return foundChevronCell ? foundChevronCell.parentId === row.rowId : false;
  });

/* 
  Checks is row expanded
*/
const isRowFullyExpanded = (rows: Row[], row: Row): boolean => {
  const parentRow = findParentRow(rows, row);
  if (parentRow) {
    const foundChevronCell = findChevronCell(parentRow);
    if (foundChevronCell && !foundChevronCell.isExpanded) return false;
    return isRowFullyExpanded(rows, parentRow);
  }
  return true;
};

const getExpandedRows = (rows: Row[]): Row[] =>
  rows.filter((row) => {
    const areAllParentsExpanded = isRowFullyExpanded(rows, row);
    return areAllParentsExpanded !== undefined ? areAllParentsExpanded : true;
  });

const getDirectChildRows = (rows: Row[], parentRow: Row): Row[] =>
  rows.filter(
    (row) =>
      !!row.cells.find(
        (cell) =>
          cell.type === "chevron" &&
          (cell as ChevronCell).parentId === parentRow.rowId
      )
  );

const assignIndentAndHasChildren = (
  rows: Row[],
  parentRow: Row,
  indent: number = 0
) => {
  ++indent;
  getDirectChildRows(rows, parentRow).forEach((row) => {
    const foundChevronCell = findChevronCell(row);
    const hasRowChildrens = hasChildren(rows, row);
    if (foundChevronCell) {
      foundChevronCell.indent = indent;
      foundChevronCell.hasChildren = hasRowChildrens;
    }
    if (hasRowChildrens) assignIndentAndHasChildren(rows, row, indent);
  });
};

const buildTree = (rows: Row[]): Row[] =>
  rows.map((row, index) => {
    const foundChevronCell = findChevronCell(row);
    if (foundChevronCell) {
      foundChevronCell.text = index.toString();
      if (!foundChevronCell.parentId) {
        const hasRowChildrens = hasChildren(rows, row);
        foundChevronCell.hasChildren = hasRowChildrens;
        if (hasRowChildrens) assignIndentAndHasChildren(rows, row);
      }
    }
    return row;
  });

interface NestedGridProps {
  // Add any props if needed
}

export const NestedGrid: React.FC<NestedGridProps> = () => {
  const [columns] = useState<Column[]>(() => dataColumns(true, false));
  const [rows, setRows] = useState<Row[]>(() => buildTree(dataRows(true)));
  const [rowsToRender, setRowsToRender] = useState<Row[]>([
    headerRow,
    ...getExpandedRows(rows)
  ]);

  const handleChanges = (changes: CellChange[]) => {
    console.log("Changing rows");
    const newRows = [...rows];
    changes.forEach((change) => {
      const changeRowIdx = rows.findIndex((el) => el.rowId === change.rowId);
      const changeColumnIdx = columns.findIndex(
        (el) => el.columnId === change.columnId
      );
      newRows[changeRowIdx].cells[changeColumnIdx] = change.newCell;
    });
    setRows(buildTree(newRows));
    setRowsToRender([headerRow, ...getExpandedRows(newRows)]);
  };

  const generateUniqueId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleContextMenu = (
    selectedRowIds: Id[],
    selectedColIds: Id[],
    selectionMode: SelectionMode,
    menuOptions: MenuOption[]
  ): MenuOption[] => {
    if (selectionMode === 'row' && selectedRowIds.length === 1) {
      const selectedRowId = selectedRowIds[0];
      const selectedRowIndex = rows.findIndex(row => row.rowId === selectedRowId);
      const selectedRow = rows.find(row => row.rowId === selectedRowId) as Row;
      const foundChevronCell = findChevronCell(selectedRow);

      const addRowBelowOption: MenuOption = {
        id: 'addRowBelow',
        label: 'Add Row Below',
        handler: () => {
          if (selectedRowIndex !== -1) {
            const newRow = createNewRow(columns, rows, selectedRow, foundChevronCell!);
            const newRows = [
              ...rows.slice(0, selectedRowIndex + 1),
              newRow,
              ...rows.slice(selectedRowIndex + 1)
            ];
            setRows(newRows);
            // Rebuild the tree and update the rendered rows
            const updatedRows = buildTree(newRows);
            setRows(updatedRows);
            setRowsToRender([headerRow, ...getExpandedRows(updatedRows)]);
          }
        }
      };

      const addRowAboveOption: MenuOption = {
        id: 'addRowAbove',
        label: 'Add Row Above',
        handler: () => {
          if (selectedRowIndex !== -1) {
            const newRow = createNewRow(columns, rows, selectedRow, foundChevronCell!);
            const newRows = [
              ...rows.slice(0, selectedRowIndex),
              newRow,
              ...rows.slice(selectedRowIndex)
            ];
            setRows(newRows);
            // Rebuild the tree and update the rendered rows
            const updatedRows = buildTree(newRows);
            setRows(updatedRows);
            setRowsToRender([headerRow, ...getExpandedRows(updatedRows)]);
          }
        }
      };

      const makeChildTaskOption: MenuOption = {
        id: 'makeChildTask',
        label: 'Make Child Task',
        handler: () => {
          if (selectedRowIndex > 0) {
            const newRows = [...rows];
            const parentRow = newRows[selectedRowIndex - 1];
            const newRowId = generateUniqueId();
            const updatedSelectedRow = {
              ...selectedRow,
              rowId: newRowId,
              cells: selectedRow.cells.map((cell, index) => {
                if (index === 0 && cell.type === 'chevron') {
                  return {
                    ...cell,
                    text: newRowId,
                    parentId: parentRow.rowId,
                    isExpanded: false
                  };
                }
                return cell;
              })
            };
            newRows[selectedRowIndex] = updatedSelectedRow;
            
            // Update the parent row to ensure it's expanded
            newRows[selectedRowIndex - 1] = {
              ...parentRow,
              cells: parentRow.cells.map((cell, index) => {
                if (index === 0 && cell.type === 'chevron') {
                  return {
                    ...cell,
                    isExpanded: true
                  };
                }
                return cell;
              })
            };

            setRows(newRows);
            const updatedRows = buildTree(newRows);
            setRows(updatedRows);
            setRowsToRender([headerRow, ...getExpandedRows(updatedRows)]);
          }
        }
      };

      const promoteTaskOption: MenuOption = {
        id: 'promoteTask',
        label: 'Promote Task',
        handler: () => {
          const newRows = [...rows];
          const selectedRowIndex = newRows.findIndex(row => row.rowId === selectedRowId);
          const selectedRow = newRows[selectedRowIndex];
          
          const firstCell = selectedRow.cells[0];
          if (firstCell.type === 'chevron' && firstCell.parentId !== undefined) {
            const parentRowIndex = newRows.findIndex(row => row.rowId === firstCell.parentId);
            
            if (parentRowIndex !== -1) {
              const parentRow = newRows[parentRowIndex];
              const parentFirstCell = parentRow.cells[0];
              const newRowId = generateUniqueId();
              
              // Update the selected row
              const updatedSelectedRow = {
                ...selectedRow,
                rowId: newRowId,
                cells: selectedRow.cells.map((cell, index) => {
                  if (index === 0 && cell.type === 'chevron') {
                    return {
                      ...cell,
                      text: newRowId,
                      parentId: parentFirstCell.type === 'chevron' ? parentFirstCell.parentId : undefined,
                      isExpanded: false
                    };
                  }
                  return cell;
                })
              };

              // Remove the old row and insert the updated one
              newRows.splice(selectedRowIndex, 1);
              newRows.splice(parentRowIndex + 1, 0, updatedSelectedRow);

              setRows(newRows);
              const updatedRows = buildTree(newRows);
              setRows(updatedRows);
              setRowsToRender([headerRow, ...getExpandedRows(updatedRows)]);
            }
          }
        }
      };

      // Add more options as needed

      return [...menuOptions, addRowBelowOption, addRowAboveOption, makeChildTaskOption, promoteTaskOption];
    }
    return menuOptions;
  };

  return (
    <div>
      <ReactGrid 
        rows={rowsToRender} 
        columns={columns} 
        onContextMenu={handleContextMenu}
        onCellsChanged={handleChanges}
        enableRowSelection
        enableColumnSelection
      />
    </div>
  );
};

const createNewRow = (columns: Column[], rows: Row[], selectedRow: Row, chevronCell: ChevronCell): Row => {
  return {
    rowId: rows.length+1,
    height: 25,
    reorderable: true,
    cells: [
      { type: "chevron", indent: 0, text: "16", isExpanded: true, nonEditable: true, parentId: chevronCell.parentId },
      { type: "text", text: uuidv4() },
      { type: "text", text: `1234` }
    ]
  };
};