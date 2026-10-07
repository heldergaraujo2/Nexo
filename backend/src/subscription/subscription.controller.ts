import { Body,Controller,Get,Headers,Param,Post,Put,Req,UseGuards } from '@nestjs/common';
import { AuthGuard,AuthenticatedRequest } from '../auth/auth.guard';
import { CancelSubscriptionDto,CreateSubscriptionDto,SetSubscriptionStatusDto } from './dto';
import { SubscriptionService } from './subscription.service';
@UseGuards(AuthGuard)
@Controller('subscriptions')
export class SubscriptionController{
 constructor(private readonly subscriptions:SubscriptionService){}
 @Post()create(@Req() req:AuthenticatedRequest,@Body() dto:CreateSubscriptionDto){return this.subscriptions.create(req.user,dto);}
 @Get('me')get(@Req() req:AuthenticatedRequest){return this.subscriptions.get(req.user);}
 @Post(':subscriptionId/renew')renew(@Req() req:AuthenticatedRequest,@Param('subscriptionId') id:string,@Headers('idempotency-key') key:string){return this.subscriptions.renew(req.user,id,key);}
 @Post(':subscriptionId/cancel')cancel(@Req() req:AuthenticatedRequest,@Param('subscriptionId') id:string,@Body() dto:CancelSubscriptionDto){return this.subscriptions.cancel(req.user,id,dto);}
 @Put(':subscriptionId/status')setStatus(@Req() req:AuthenticatedRequest,@Param('subscriptionId') id:string,@Body() dto:SetSubscriptionStatusDto){return this.subscriptions.setStatus(req.user,id,dto);}
}
