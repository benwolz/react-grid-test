import React, { useState } from "react";
import { columns as dataColumns } from "../data/columns";
import { rows as dataRows, headerRow } from "../data/rows";
import { CellChange, ChevronCell, Column, ReactGrid, Row, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import "./styles.scss";
import { v4 as uuidv4 } from 'uuid';

import { buildTree, getDirectChildRows, findChevronCell, hasChildren, isRowFullyExpanded, getExpandedRows, addChildTask, removeRow, addTaskGroup } from "./utils";

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

  // const addRowAbove = (selectedRowIndex: number, selectedRow: Row, foundChevronCell: ChevronCell) => {
  //   if (selectedRowIndex !== -1) {
  //     const newRow = createNewRow(columns, rows, selectedRow, foundChevronCell);
  //     const newRows = [
  //       ...rows.slice(0, selectedRowIndex),
  //       newRow,
  //       ...rows.slice(selectedRowIndex)
  //     ];
  //     updateRows(newRows);
  //   }
  // };

  const addRowBelow = (selectedRowIndex: number, selectedRow: Row, foundChevronCell: ChevronCell) => {
    if (selectedRowIndex !== -1) {
      const newRow = createNewRow(columns, rows, selectedRow, foundChevronCell);
      const newRows = [
        ...rows.slice(0, selectedRowIndex + 1),
        newRow,
        ...rows.slice(selectedRowIndex + 1)
      ];
      updateRows(newRows);
    }
  };

  // const handleAddChildTask = (selectedRowIndex: number) => {
  //   if (selectedRowIndex !== -1) {
  //     const newRows = addChildTask(rows, selectedRowIndex);
  //     updateRows(newRows);
  //   }
  // };

  const handleAddTaskGroup = (selectedRowIndex: number) => {
    if (selectedRowIndex !== -1) {
      const newRows = addTaskGroup(rows, selectedRowIndex);
      updateRows(newRows);
    }
  };

  const promoteTask = (selectedRowId: Id) => {
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

        updateRows(newRows);
      }
    }
  };

  const updateRows = (newRows: Row[]) => {
    const updatedRows = buildTree(newRows);
    setRows(updatedRows);
    setRowsToRender([headerRow, ...getExpandedRows(updatedRows)]);
  };

  const handleRemoveRow = (selectedRowId: Id) => {
    const newRows = removeRow(rows, selectedRowId);
    updateRows(newRows);
  };

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

      // const addRowAboveOption: MenuOption = {
      //   id: 'addRowAbove',
      //   label: 'Add Row Above',
      //   handler: () => addRowAbove(selectedRowIndex, selectedRow, foundChevronCell!)
      // };

      const addRowBelowOption: MenuOption = {
        id: 'addTaskBelow',
        label: 'Add Task Below',
        handler: () => addRowBelow(selectedRowIndex, selectedRow, foundChevronCell!)
      };

      // const makeChildTaskOption: MenuOption = {
      //   id: 'addChildTask',
      //   label: 'Add Child Task',
      //   handler: () => handleAddChildTask(selectedRowIndex)
      // };

      const addTaskGroupOption: MenuOption = {
        id: 'addTaskGroupBelow',
        label: 'Add Task Group Below',
        handler: () => handleAddTaskGroup(selectedRowIndex)
      }

      // const promoteTaskOption: MenuOption = {
      //   id: 'promoteTask',
      //   label: 'Promote Task',
      //   handler: () => promoteTask(selectedRowId)
      // };

      const removeTaskOption: MenuOption = {
        id: 'removeTask',
        label: 'Remove Task',
        handler: () => handleRemoveRow(selectedRowId)
      };

      return [addRowBelowOption, addTaskGroupOption, removeTaskOption];
      // return [...menuOptions, addRowBelowOption, addRowAboveOption, makeChildTaskOption, promoteTaskOption, removeRowOption];
    }
    return menuOptions;
  };

  const getRowWithDescendants = (rows: Row[], rowId: Id): Row[] => {
    const rowIndex = rows.findIndex(row => row.rowId === rowId);
    if (rowIndex === -1) return [];

    const result = [rows[rowIndex]];
    let currentIndex = rowIndex + 1;

    while (currentIndex < rows.length) {
      const currentRow = rows[currentIndex];
      const currentChevron = currentRow.cells[0] as ChevronCell;
      const parentChevron = result[0].cells[0] as ChevronCell;

      if (currentChevron.indent! <= parentChevron.indent!) break;
      result.push(currentRow);
      currentIndex++;
    }

    return result;
  };

  const handleRowsReorder = (targetRowId: Id, rowIds: Id[]) => {
    console.log("Reordering rows");
    console.log(targetRowId, rowIds);
    setRows((prevRows) => {
      let newRows = [...prevRows];
      const to = newRows.findIndex(row => row.rowId === targetRowId);
      
      // Collect all rows to be moved, including their descendants
      const rowsToMove: Row[] = [];
      rowIds.forEach(id => {
        const rowWithDescendants = getRowWithDescendants(newRows, id);
        rowsToMove.push(...rowWithDescendants);
      });

      // Remove the rows from their original positions
      newRows = newRows.filter(row => !rowsToMove.some(r => r.rowId === row.rowId));
      
      // Insert the rows at their new position
      newRows.splice(to, 0, ...rowsToMove);
      
      return newRows;
    });
  };

  // Use effect to update rowsToRender when rows change
  React.useEffect(() => {
    setRowsToRender([headerRow, ...getExpandedRows(rows)]);
  }, [rows]);

  return (
    <div>
      <ReactGrid 
        rows={rowsToRender} 
        columns={columns} 
        onContextMenu={handleContextMenu}
        onCellsChanged={handleChanges}
        // onRowsReordered={handleRowsReorder}
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