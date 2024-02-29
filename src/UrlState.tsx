import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUrlState } from "./hooks/useUrlState";

export const UrlState = React.memo(function UrlState() {
  const navigate = useNavigate();
  const location = useLocation();
  useUrlState(params =>
    navigate({
      pathname: location.pathname,
      search: decodeURIComponent(new URLSearchParams(params).toString()),
    })
  );
  return null;
});

export default UrlState;
