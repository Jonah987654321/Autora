import { Children, Fragment, type ReactNode } from "react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

interface TodoEntryProps {
    title: string,
    id: String
}
function TodoEntry({title, id} : TodoEntryProps) {
    return (
        <div className="flex flex-row items-center space-x-3 hover:bg-accent">
            <Checkbox id={"tdle-" + id} />
            <Label htmlFor={"tdle-" + id}>{title}</Label>
        </div>
    );
}

interface TodoListProps {
    children: ReactNode;
}
function TodoList({children} : TodoListProps) {
    const childrenArray = Children.toArray(children);

    return (
        <>
            {childrenArray.map((child, index) => {
                return <Fragment key={index}>
                    {child}
                
                    {index < childrenArray.length - 1 && (
                        <Separator className="mb-2 mt-2" />
                    )}
                </Fragment>
            })}
        </>
    );
}

export { TodoEntry, TodoList }