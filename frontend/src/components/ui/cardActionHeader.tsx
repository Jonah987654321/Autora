import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";

interface CardActionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function CardActionHeader({ title, action }: CardActionHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <CardTitle>{title}</CardTitle>
      <div>{action}</div>
    </CardHeader>
  );
}