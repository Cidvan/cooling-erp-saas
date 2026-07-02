import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserProfileSchema, updatePasswordSchema, type UpdateUserProfile, type UpdatePassword, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, UserCircle, Lock } from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // For demo purposes, using a hardcoded user ID
  // In production, this would come from authentication context/session
  const userId = "demo-user-id";

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/user/profile', userId],
    queryFn: async () => {
      const response = await fetch(`/api/user/profile/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return response.json();
    },
  });

  // Profile form
  const profileForm = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
    values: user ? {
      username: user.username,
      email: user.email || "",
    } : undefined,
  });

  // Password form
  const passwordForm = useForm<UpdatePassword>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      return apiRequest('PUT', `/api/user/profile/${userId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile', userId] });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update profile";
      
      // Try to extract error message from JSON response
      if (error.message) {
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: UpdatePassword) => {
      return apiRequest('PUT', `/api/user/password/${userId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to change password";
      
      // Try to extract error message from JSON response
      if (error.message) {
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: UpdateUserProfile) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: UpdatePassword) => {
    updatePasswordMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-profile">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-profile">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-profile-title">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and security</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Information Card */}
        <Card data-testid="card-profile-info">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>
              Update your username and email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter username" 
                          {...field} 
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="Enter email" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card data-testid="card-change-password">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter current password" 
                          {...field} 
                          data-testid="input-current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter new password (min 6 characters)" 
                          {...field} 
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Confirm new password" 
                          {...field} 
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updatePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
