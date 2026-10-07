import { Body,Controller,Get,Headers,HttpCode,Inject,Param,Post,Req,UseGuards } from '@nestjs/common';
import { AuthGuard,AuthenticatedRequest } from '../auth/auth.guard';
import { CancelSubscriptionDto } from './dto';
import { SubscriptionService } from './subscription.service';
@UseGuards(AuthGuard)
@Controller('subscriptions')
export class SubscriptionController {
 private readonly service: SubscriptionService;
 constructor(@Inject(SubscriptionService) service: SubscriptionService) {
   this.service = service;
 }
 @Get('me') mine(@Req()r:AuthenticatedRequest){return this.service.getMine(r.user);}
 @Post('me') subscribe(@Req()r:AuthenticatedRequest,@Headers('idempotency-key')key:string){return this.service.subscribe(r.user,key).then(x=>x.body);}
 @HttpCode(200) @Post('me/cancel') cancel(@Req()r:AuthenticatedRequest,@Headers('idempotency-key')key:string,@Body()d:CancelSubscriptionDto){return this.service.getMine(r.user).then(s=>{if(!s)throw new Error('Subscription not found');return this.service.cancel(r.user,s.id,d,key).then(x=>x.body);});}
 @HttpCode(200) @Post(':id/renew') renew(@Req()r:AuthenticatedRequest,@Param('id')id:string,@Headers('idempotency-key')key:string){return this.service.renew(r.user,id,key).then(x=>x.body);}
 @Get(':id/history') history(@Req()r:AuthenticatedRequest,@Param('id')id:string){return this.service.getHistory(r.user,id);}
}