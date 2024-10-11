import { Row, ChevronCell, Id } from "@silevis/reactgrid";
import { v4 as uuidv4 } from 'uuid';

/* 
  searches for a chevron cell in given row
*/
export const findChevronCell = (row: Row) =>
    row.cells.find((cell) => cell.type === "chevron") as ChevronCell | undefined;

/* 
  searches for a parent of given row
*/
export const findParentRow = (rows: Row[], row: Row) =>
    rows.find((r) => {
        const foundChevronCell = findChevronCell(row);
        return foundChevronCell ? r.rowId === foundChevronCell.parentId : false;
    });

/* 
  check if the row has children
*/
export const hasChildren = (rows: Row[], row: Row): boolean =>
    rows.some((r) => {
        const foundChevronCell = findChevronCell(r);
        return foundChevronCell ? foundChevronCell.parentId === row.rowId : false;
    });

/* 
  Checks is row expanded
*/
export const isRowFullyExpanded = (rows: Row[], row: Row): boolean => {
    const parentRow = findParentRow(rows, row);
    if (parentRow) {
        const foundChevronCell = findChevronCell(parentRow);
        if (foundChevronCell && !foundChevronCell.isExpanded) return false;
        return isRowFullyExpanded(rows, parentRow);
    }
    return true;
};

export const getExpandedRows = (rows: Row[]): Row[] =>
    rows.filter((row) => {
        const areAllParentsExpanded = isRowFullyExpanded(rows, row);
        return areAllParentsExpanded !== undefined ? areAllParentsExpanded : true;
    });

export const getDirectChildRows = (rows: Row[], parentRow: Row): Row[] =>
    rows.filter(
        (row) =>
            !!row.cells.find(
                (cell) =>
                    cell.type === "chevron" &&
                    (cell as ChevronCell).parentId === parentRow.rowId
            )
    );

export const assignIndentAndHasChildren = (
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

export const buildTree = (rows: Row[]): Row[] =>

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

export const buildTree2 = (rows: Row[]): Row[] => {
    console.log("toposort");
    console.log(rows.map(row => row.rowId));
    const rowMap = new Map<Id, Row>();
    const rowGraph = new Map<Id, Row[]>();
    const rootRows: Row[] = [];

    // First pass: create a map of all rows and identify root rows
    rows.forEach(row => {
        rowMap.set(row.rowId, row);
        const chevronCell = row.cells.find(cell => cell.type === "chevron") as ChevronCell | undefined;
        if (chevronCell?.parentId) {
            rowGraph.set(chevronCell.parentId, [...rowGraph.get(chevronCell.parentId) || [], row]);
        }
        if (chevronCell && !chevronCell.parentId) {
            rootRows.push(row);
        }
    });

    // Topological sort function with indentation
    const topologicalSort = (node: Row, indent: number): Row[] => {
        const result: Row[] = [];
        const chevronCell = node.cells[0] as ChevronCell;
        chevronCell.indent = indent;
        
        // Sort children recursively
        if (rowGraph.has(node.rowId)) {
            rowGraph.get(node.rowId)!.forEach(child => {
                result.push(...topologicalSort(child, indent + 1));
            });
        }

        // Add current node after all its children
        result.push(node);

        return result;
    };

    // Perform topological sort starting from root rows
    const sortedRows: Row[] = [];
    rootRows.forEach(rootRow => {
        sortedRows.push(...topologicalSort(rowMap.get(rootRow.rowId)!, 0));
    });

    // Update text property and remove temporary properties
    return sortedRows.reverse().map((row, index) => {
        const chevronCell = row.cells[0] as ChevronCell;
        chevronCell.text = index.toString();
        return row;
    });
};

export const addChildTask = (rows: Row[], parentRowIndex: number): Row[] => {
    const newRows = [...rows];
    const parentRow = newRows[parentRowIndex];
    const newRowId = uuidv4();

    // Create the new child row
    const newChildRow: Row = {
        rowId: newRowId,
        cells: parentRow.cells.map((cell, index) => {
            if (index === 0 && cell.type === 'chevron') {
                return {
                    type: 'chevron',
                    text: newRowId,
                    parentId: parentRow.rowId,
                    isExpanded: false,
                    indent: (cell.indent || 0) + 1
                };
            }
            // For other cells, create empty cells of the same type
            return { ...cell, text: '' };
        })
    };

    // Update the parent row to ensure it's expanded
    newRows[parentRowIndex] = {
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

    // Insert the new child row after the parent
    newRows.splice(parentRowIndex + 1, 0, newChildRow);

    return newRows;
};

export const addTaskGroup = (rows: Row[], parentRowIndex: number): Row[] => {
    const newRows = [...rows];
    const parentRow = newRows[parentRowIndex];
    const taskGroupRowId = uuidv4();
    const taskRowId = uuidv4();

    // Create the new task Group row
    const taskGroupRow: Row = {
        rowId: taskGroupRowId,
        cells: parentRow.cells.map((cell, index) => {
            if (index === 0 && cell.type === 'chevron') {
                return {
                    type: 'chevron',
                    text: "New Task Group",
                    parentId: cell.parentId,
                    isExpanded: true,
                    indent: (cell.indent || 0)
                };
            }
            // For other cells, create empty cells of the same type
            return { ...cell, text: '' };
        })
    };

    // Create the new task row
    const taskRow: Row = {
        rowId: taskRowId,
        cells: parentRow.cells.map((cell, index) => {
            if (index === 0 && cell.type === 'chevron') {
                return {
                    type: 'chevron',
                    text: "New Task",
                    parentId: taskGroupRowId,
                    isExpanded: false,
                    indent: (cell.indent || 0) + 1
                };
            }
            // For other cells, create empty cells of the same type
            return { ...cell, text: '' };
        })
    };

    // Update the parent row to ensure it's expanded
    newRows[parentRowIndex] = {
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

    // Insert the new child row after the parent
    newRows.splice(parentRowIndex + 1, 0, taskGroupRow);
    newRows.splice(parentRowIndex + 2, 0, taskRow);

    return newRows;
};

export const removeRow = (rows: Row[], rowIdToRemove: Id): Row[] => {
    console.log("removeRow", rowIdToRemove);
    var newRows = [...rows];
    console.log(newRows.map(row => row.rowId));
    const indexToRemove = newRows.findIndex(row => row.rowId === rowIdToRemove);

    if (indexToRemove === -1) {
        console.log("row not found");
        console.log("Available rowIds:", newRows.map(row => row.rowId));
        return newRows; // Row not found, return original array
    }

    const rowToRemove = newRows[indexToRemove];
    const firstCell = rowToRemove.cells[0];

    if (firstCell.type === 'chevron') {
        // If the row has children, remove them as well
        const childrenToRemove = getDirectChildRows(newRows, rowToRemove);
        const childIds = childrenToRemove.map(child => child.rowId);
        newRows = newRows.filter(row => !childIds.includes(row.rowId));
    }

    // Remove the row itself
    newRows.splice(indexToRemove, 1);

    return newRows;
};

