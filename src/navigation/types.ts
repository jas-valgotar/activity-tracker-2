// Overview: Defines navigation route params for type-safe screen transitions.

export type RootStackParamList = {
  MainTabs: undefined;
  ActivityDetail: {
    activityId: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  All: undefined;
};
