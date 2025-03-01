import React from "react";

const EMPTY = Symbol();

export function createContainer(
  useHook
){
  const Context = React.createContext(EMPTY);

  const Provider = (props) => {
    const value = useHook(props.initialState);
    return <Context.Provider value={value}>{props.children}</Context.Provider>;
  };

  function useContainer() {
    const value = React.useContext(Context);
    if (value === EMPTY)
      throw new Error("Component must be wrapped with <Container.Provider>");
    return value;
  }

  return { Provider, useContainer };
}
