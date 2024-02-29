import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, redirect, LoaderFunction } from "react-router-dom";
import "./index.css";

import File from "./File";

import { getRandomUser } from "./utils/getRandomUser";
import { getShortUUID, isShortUUID } from "./utils/uuid";

/**
 * Replace in production with user and file authentication.
 */
const checkForUserAndFile: LoaderFunction = ({ params: { fileId } }) => {
  const user = JSON.parse(localStorage.getItem("user") || "null") || getRandomUser();
  localStorage.setItem("user", JSON.stringify(user));
  if (!fileId || !isShortUUID(fileId as string)) return redirect(`/file/${getShortUUID()}`);
  return {
    user,
    fileId,
  };
};

const router = createBrowserRouter([
  {
    path: "/file/:fileId",
    element: <File />,
    loader: checkForUserAndFile,
  },
  {
    path: "*",
    element: <div></div>,
    loader: () => redirect(`/file/${getShortUUID()}`),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
